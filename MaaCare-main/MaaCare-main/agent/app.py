import os
import asyncio
import requests
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from firecrawl import AsyncFirecrawlApp, ScrapeOptions
from twilio.rest import Client

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn


load_dotenv()

FACTCHECK_API_KEY = os.getenv("GOOGLE_FACTCHECK_API_KEY")
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")


TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_FROM")
ALERT_TO = os.getenv("ALERT_TO")


def fact_check_api(query: str) -> str:
    url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {"query": query, "key": FACTCHECK_API_KEY}
    try:
        response = requests.get(url, params=params)
        if response.ok:
            data = response.json()
            claims = data.get("claims", [])
            if claims:
                english_claims = [
                    c for c in claims
                    if c.get("claimReview")
                    and c["claimReview"][0].get("languageCode") == "en"
                ]
                claim = english_claims[0] if english_claims else claims[0]

                text = claim.get("text", "No claim text found")
                claimant = claim.get("claimant", "Unknown claimant")
                claim_review = claim.get("claimReview", [])
                if claim_review:
                    review = claim_review[0]
                    publisher = review.get("publisher", {}).get("name", "Unknown publisher")
                    url = review.get("url", "No URL provided")
                    rating = review.get("textualRating", "No rating")
                else:
                    publisher, url, rating = "N/A", "N/A", "N/A"

                formatted = (
                    f"Claim: {text}\n"
                    f"Claimant: {claimant}\n"
                    f"Publisher: {publisher}\n"
                    f"Source: {url}\n"
                    f"Rating: {rating}"
                )
                return formatted
            else:
                return "No fact check information found."
        else:
            return f"API error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error: {str(e)}"

async def firecrawl_search_api(query: str, limit: int = 5) -> str:
    try:
        app = AsyncFirecrawlApp(api_key=FIRECRAWL_API_KEY)
        response = await app.search(
            query=query,
            limit=limit,
            scrape_options=ScrapeOptions(formats=['markdown'])
        )
        return str(response)
    except Exception as e:
        return f"Firecrawl search error: {str(e)}"

def schemes_search(query: str) -> str:
    return asyncio.run(firecrawl_search_api(query))


def format_schemes_with_llm(raw_text: str) -> str:
    prompt = f"""
You are a helpful assistant specialized in summarizing government schemes for pregnant women.

Given the raw scraped text below, extract and clearly format the important information in simple plain text.

Format the info as a numbered list like this, without any emojis, asterisks (*), bullets, or markdown syntax:

1. Scheme Name: ...
Eligibility Criteria: ...
How to Apply: ...
Other Details: ...

Use real line breaks (actual newlines) and blank lines between sections for clarity.

Raw text:
\"\"\"
{raw_text}
\"\"\"
"""
    try:
        response = gemini_llm.invoke(prompt)
        formatted = response.content.strip()
        formatted = formatted.replace('\\n', '\n')
        return formatted
    except Exception as e:
        return f"❌ Error formatting schemes info: {str(e)}"

def send_sms_alert(message: str) -> str:
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        sms = client.messages.create(
            body=message,
            from_=TWILIO_FROM,
            to=ALERT_TO
        )
        return f"✅ Alert sent via SMS. SID: {sms.sid}"
    except Exception as e:
        return f"❌ Failed to send SMS: {str(e)}"

gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3,
    google_api_key=GEMINI_API_KEY
)


def load_vector_store_from_pdfs():
    index_path = "pregnancy_faiss_index"
    embeddings = HuggingFaceEmbeddings()

    if os.path.exists(index_path):
        return FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)

    all_docs = []
    pdf_folder = "docs"
    if os.path.exists(pdf_folder):
        for filename in os.listdir(pdf_folder):
            if filename.endswith(".pdf"):
                path = os.path.join(pdf_folder, filename)
                loader = PyPDFLoader(path)
                docs = loader.load()
                all_docs.extend(docs)

    if all_docs:
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(all_docs)
        vectorstore = FAISS.from_documents(chunks, embeddings)
        vectorstore.save_local(index_path)
        return vectorstore
    return None

vectorstore = load_vector_store_from_pdfs()
if vectorstore:
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    qa_chain = RetrievalQA.from_chain_type(llm=gemini_llm, retriever=retriever)

def rag_search(query: str) -> str:
    if not vectorstore:
        return "No pregnancy documents available."
    
    try:
        result = qa_chain.invoke({"query": query})
        return result.get("result") or result.get("text") or str(result)
    except Exception as e:
        return f"RAG search error: {str(e)}"


def get_llm_answer(question: str) -> str:
    llm_prompt = f"""
You are a helpful pregnancy assistant. Answer this question clearly and concisely in 2-3 paragraphs.
Always mention consulting healthcare providers for personalized advice.

Question: {question}
"""
    try:
        answer = gemini_llm.invoke(llm_prompt)
        return f"💬 General Answer:\n{answer.content}"
    except Exception as e:
        return f"❌ Error getting answer: {str(e)}"

def route_query(question: str) -> str:
    routing_prompt = f"""
    You are a smart pregnancy assistant router. Analyze this question and decide what action to take:

    Question: "{question}"

    Choose ONE action:
    1. EMERGENCY - If mentions severe symptoms (severe headache, chest pain, severe bleeding, unconscious, can't breathe, severe pain)
    2. FACT_CHECK - If asking about safety, claims, or "is it true" about foods/activities during pregnancy  
    3. SCHEMES - If asking about government benefits, schemes, maternity leave, financial help
    4. RAG - If asking normal pregnancy questions that might be in documents
    5. LLM - If general pregnancy advice, tips, normal information

    Respond with ONLY the action name: EMERGENCY, FACT_CHECK, SCHEMES, RAG, or LLM
    """
    try:
        decision = gemini_llm.invoke(routing_prompt).content.strip().upper()
        
        if "EMERGENCY" in decision:
            alert_msg = f"⚠️ URGENT: Patient Priya reported '{question}'. Needs immediate medical attention."
            sms_result = send_sms_alert(alert_msg)
            return f"🚨 EMERGENCY DETECTED! {sms_result}\n\nPlease seek immediate medical attention!"
            
        elif "FACT_CHECK" in decision:
            fact_result = fact_check_api(question)
            return f"🔍 Fact Check Result:\n{fact_result}"
            
        elif "SCHEMES" in decision:
            raw_scheme_text = schemes_search(question)
            formatted_scheme_text = format_schemes_with_llm(raw_scheme_text)
            return f"🏛️ From Web scrapping agent Government Schemes Info:\n{formatted_scheme_text}"
            
        elif "RAG" in decision:
            rag_result = rag_search(question)
            
            if "RAG search error" in rag_result or "No pregnancy documents available" in rag_result:
                return get_llm_answer(question)
            else:
                return f"📚 From Pregnancy Documents:\n{rag_result}"
        
        else:
            return get_llm_answer(question)
            
    except Exception as e:
        print(f"Routing error: {e}")
        return get_llm_answer(question)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

async def async_route_query(question: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, route_query, question)

@app.post("/chat")
async def chat_endpoint(request: QueryRequest):
    question = request.question.strip()
    if not question:
        return {"answer": "Please ask a valid question."}
    answer = await async_route_query(question)
    return {"answer": answer}


if __name__ == "__main__":
    print("🚀 Starting Pregnancy Assistant API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
