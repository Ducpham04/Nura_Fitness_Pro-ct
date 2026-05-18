import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("GROQ_API_KEY not found in .env file")
    exit(1)
client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

print("Listing Groq models:")
try:
    for m in client.models.list().data:
        print(f"Model Name: {m.id}")
except Exception as e:
    print(f"Error: {e}")
