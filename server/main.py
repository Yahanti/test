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
        return {"products": []}

    print(f"Buscando: {request.query}...")

    try:
        params = {
            "engine": "google_shopping",
            "q": request.query,
            "gl": "br",
            "hl": "pt",
            "api_key": api_key,
            "num": 20  # AUMENTEI PARA 20 RESULTADOS
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
        print(f"Erro: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_consultant(request: ChatRequest):
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=gemini_key)
        
        generation_config = {
            "response_mime_type": "application/json",
        }
        
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config=generation_config) 

        # --- AQUI ESTAVA O ERRO ---
        # Antes estava: enumerate(request.products_context[:10])
        # Agora lê TUDO:
        products_list_str = ""
        for i, p in enumerate(request.products_context):
            products_list_str += f"ID {i}: {p['title']} | Preço: {p['price']} | Loja: {p['source']}\n"
        
        prompt = f"""
        Você é um assistente de compras perito em economia.
        
        LISTA COMPLETA DE PRODUTOS ENCONTRADOS (com IDs):
        {products_list_str}
        
        PERGUNTA DO USUÁRIO: "{request.message}"
        
        OBJETIVO:
        1. Analise TODOS os produtos da lista acima, do primeiro ao último.
        2. Se o usuário pedir "o mais barato", compare os valores numéricos de todos eles.
        3. Identifique o vencedor.
        
        Retorne APENAS um JSON:
        {{
            "reply": "Explicação curta citando o produto e o preço.",
            "recommended_index": (Número do ID do produto vencedor)
        }}
        """

        response = model.generate_content(prompt)
        response_data = json.loads(response.text)
        
        return response_data
        
    except Exception as e:
        print(f"Erro IA: {e}")
        return {"reply": "Tive um erro técnico ao ler a lista, tente novamente.", "recommended_index": None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
