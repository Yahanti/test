# server/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    query: str

class ChatRequest(BaseModel):
    message: str
    products_context: list

@app.post("/api/search")
async def search_products(request: SearchRequest):
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        print("ERRO: SERPAPI_KEY não encontrada!")
        return {"products": []}

    print(f"Buscando: {request.query}...")

    try:
        params = {
            "engine": "google_shopping",
            "q": request.query,
            "gl": "br",
            "hl": "pt",
            "api_key": api_key,
            "num": 20
        }
        
        response = requests.get("https://serpapi.com/search", params=params)
        data = response.json()
        
        products = []
        results = data.get("shopping_results", [])
        
        for item in results:
            link = item.get("link") or item.get("product_link")
            if not link: continue

            products.append({
                "title": item.get("title"),
                "price": item.get("price"),
                "source": item.get("source", "Oferta"),
                "link": link,
                "thumbnail": item.get("thumbnail"),
                "rating": item.get("rating", 0)
            })
            
        return {"products": products}

    except Exception as e:
        print(f"Erro Search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_consultant(request: ChatRequest):
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            print("ERRO CRÍTICO: GEMINI_API_KEY não configurada!")
            return {"reply": "Erro de configuração no servidor (Falta API Key).", "recommended_index": None}

        genai.configure(api_key=gemini_key)
        
        # Configuração simplificada para evitar conflitos
        generation_config = {
            "temperature": 0.4,
        }
        
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config=generation_config) 

        if not request.products_context:
            return {"reply": "Não encontrei produtos para analisar. Faça uma busca primeiro!", "recommended_index": None}

        products_list_str = ""
        for i, p in enumerate(request.products_context):
            products_list_str += f"ID {i}: {p['title']} | Preço: {p['price']} | Loja: {p['source']}\n"
        
        prompt = f"""
        Você é um assistente de compras.
        
        LISTA DE PRODUTOS:
        {products_list_str}
        
        USUÁRIO: "{request.message}"
        
        Responda APENAS com um JSON puro, sem crases, sem markdown.
        Formato obrigatório:
        {{
            "reply": "Texto curto explicando a escolha.",
            "recommended_index": 0
        }}
        Se não houver recomendação clara, use null no index.
        """

        response = model.generate_content(prompt)
        
        # --- LIMPEZA DE SEGURANÇA ---
        # Remove crases e a palavra 'json' se a IA colocar
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        
        print(f"Resposta IA (Raw): {cleaned_text}") # Para debug no Render

        try:
            response_data = json.loads(cleaned_text)
            return response_data
        except json.JSONDecodeError:
            print("Erro ao converter JSON da IA")
            return {"reply": "Entendi, mas tive dificuldade técnica para processar. O melhor preço parece ser o primeiro da lista.", "recommended_index": None}
        
    except Exception as e:
        print(f"ERRO GERAL IA: {str(e)}")
        return {"reply": f"Ocorreu um erro interno: {str(e)}", "recommended_index": None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
