// client/app/page.tsx
"use client";

import { useState } from "react";
import { Search, ShoppingBag, MessageSquare, Loader2, Send, Sparkles, AlertCircle, ShoppingCart, ThumbsUp } from "lucide-react";

// --- CONFIGURAÇÃO DA URL DA API (AUTO-DETECTA LOCALHOST OU VERCEL) ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Product {
  title: string;
  price: string;
  source: string;
  link: string;
  thumbnail: string;
  rating: number;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"store" | "ai">("store");
  
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setLoading(true);
    setError("");
    setProducts([]);
    setHighlightedIndex(null);
    setActiveTab("store");
    
    try {
      // USEI A VARIÁVEL API_URL AQUI
      const res = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
        setChatHistory([{role: 'ai', content: `Encontrei ${data.products.length} ofertas! Me pergunte qual é a melhor.`}]);
      } else {
        setError("Nenhum produto encontrado.");
      }
    } catch (err) {
      setError("Erro ao conectar com servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setChatMessage("");
    setAiLoading(true);

    try {
      // USEI A VARIÁVEL API_URL AQUI TAMBÉM
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, products_context: products }),
      });
      const data = await res.json();
      
      setChatHistory(prev => [...prev, { role: "ai", content: data.reply }]);
      
      if (data.recommended_index !== null && data.recommended_index !== undefined) {
        setHighlightedIndex(data.recommended_index);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-green-500 selection:text-black overflow-x-hidden font-sans">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-green-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center p-6 w-full max-w-7xl mx-auto">
        
        <header className="flex flex-col items-center mt-10 mb-10 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-green-400 shadow-glow mb-2">
            <Sparkles size={12} /> AI Shopping Assistant
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
            BuscaSmart
          </h1>
        </header>

        <form onSubmit={handleSearch} className="w-full max-w-2xl relative group mb-12">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 rounded-full opacity-20 group-hover:opacity-60 blur transition duration-500"></div>
          <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-full p-2 shadow-2xl">
            <Search className="ml-5 text-slate-500" size={24} />
            <input
              type="text"
              placeholder="Ex: Notebook Gamer RTX 3060..."
              className="w-full bg-transparent border-none outline-none text-white px-4 py-4 text-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-white text-black hover:bg-slate-200 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Buscar"}
            </button>
          </div>
        </form>

        {products.length > 0 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="flex justify-center mb-8">
              <div className="bg-[#111] p-1.5 rounded-full border border-white/10 flex relative">
                <button 
                  onClick={() => setActiveTab("store")}
                  className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 duration-300 ${activeTab === "store" ? "bg-white text-black shadow-lg scale-105" : "text-slate-400 hover:text-white"}`}
                >
                  <ShoppingBag size={18} /> Vitrine
                  {highlightedIndex !== null && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"/>}
                </button>
                <button 
                   onClick={() => setActiveTab("ai")}
                   className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 duration-300 ${activeTab === "ai" ? "bg-white text-black shadow-lg scale-105" : "text-slate-400 hover:text-white"}`}
                >
                  <MessageSquare size={18} /> Consultor AI
                </button>
              </div>
            </div>

            {activeTab === "store" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                {products.map((prod, idx) => {
                  const isRecommended = idx === highlightedIndex;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`
                        group relative rounded-3xl overflow-hidden transition-all duration-500 flex flex-col
                        ${isRecommended 
                          ? "border-2 border-green-500 bg-[#151515] shadow-[0_0_40px_rgba(34,197,94,0.3)] scale-105 z-10" 
                          : "border border-white/5 bg-[#0f0f0f] hover:border-white/20 hover:bg-[#151515] hover:-translate-y-2"
                        }
                      `}
                    >
                      {isRecommended && (
                        <div className="absolute top-0 inset-x-0 bg-green-600 text-black font-bold text-center text-xs py-1 z-20 animate-pulse">
                          IA RECOMENDA ESTE PRODUTO
                        </div>
                      )}

                      <a href={prod.link} target="_blank" rel="noopener noreferrer" className="h-64 bg-white p-6 flex items-center justify-center relative overflow-hidden cursor-pointer">
                        <img src={prod.thumbnail} alt={prod.title} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-700" />
                        
                        {/* Badge da Loja Ajustado */}
                        <span className="absolute top-5 left-4 bg-neutral-900/95 text-white text-xs font-bold px-4 py-2 rounded-full backdrop-blur-sm z-20 shadow-md border border-white/10 tracking-wide">
                          {prod.source}
                        </span>

                      </a>

                      <div className="p-6 flex flex-col flex-grow">
                        <a href={prod.link} target="_blank" rel="noopener noreferrer" className="text-base font-medium text-slate-200 line-clamp-2 min-h-[50px] mb-4 group-hover:text-blue-400 transition-colors cursor-pointer">
                          {prod.title}
                        </a>
                        
                        <div className="mt-auto pt-4 border-t border-white/5">
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-2xl font-bold tracking-tight ${isRecommended ? "text-green-400" : "text-white"}`}>
                              {prod.price}
                            </span>
                            
                            <a 
                              href={prod.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`
                                p-3 rounded-xl transition-all hover:scale-105 flex items-center gap-2
                                ${isRecommended ? "bg-green-500 text-black hover:bg-green-400 shadow-lg shadow-green-900/20" : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20"}
                              `}
                            >
                              <span className="text-sm font-bold ml-1">Comprar</span>
                              {isRecommended ? <ThumbsUp size={18} /> : <ShoppingCart size={18} />}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "ai" && (
              <div className="max-w-4xl mx-auto pb-20">
                 <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[650px] shadow-2xl shadow-black relative">
                  <div className="bg-[#151515] p-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-blue-500 flex items-center justify-center">
                        <Sparkles size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Consultor Inteligente</h3>
                        <p className="text-xs text-slate-400">Analisando {products.length} produtos em tempo real</p>
                      </div>
                    </div>
                    {highlightedIndex !== null && (
                      <button 
                        onClick={() => setActiveTab("store")}
                        className="text-xs bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1.5 rounded-full hover:bg-green-500/30 transition-colors animate-pulse cursor-pointer"
                      >
                        Ver produto recomendado ➔
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-5 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1f1f1f] text-slate-200 border border-white/5 rounded-bl-none'}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                       <div className="flex items-center gap-2 text-slate-500 text-sm ml-4 animate-pulse">
                          Pensando...
                       </div>
                    )}
                  </div>

                  <div className="p-4 bg-[#0a0a0a]">
                    <div className="relative flex items-center">
                      <input 
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Pergunte: Qual o melhor custo benefício?"
                        className="w-full bg-[#151515] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all pr-16"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={aiLoading || !chatMessage}
                        className="absolute right-2 bg-white text-black p-2.5 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}