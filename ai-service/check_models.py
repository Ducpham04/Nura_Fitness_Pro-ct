"""Script to list available Groq models for the API key."""
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load from .env file
load_dotenv()

# Get API key
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("GROQ_API_KEY not found in .env file")
    exit(1)

# Configure
print(f"API Key: {api_key[:20]}...")
client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

print("\n--- DANH SÁCH MODEL KHẢ DỤNG ---")
print("Models available from Groq:\n")

for m in client.models.list().data:
    print(f"- {m.id}")
    print()

print("\n--- KẾT THÚC ---")
print("\n👉 Sử dụng một trong các model ID ở trên trong code")
