"""
Script to list available Gemini models for the API key
"""
import os
import google.generativeai as genai

# Load from .env file
from dotenv import load_dotenv
load_dotenv()

# Get API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ GEMINI_API_KEY not found in .env file")
    exit(1)

# Configure
print(f"API Key: {api_key[:20]}...")
genai.configure(api_key=api_key)

print("\n--- DANH SÁCH MODEL KHẢ DỤNG ---")
print("Models hỗ trợ generateContent:\n")

for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"✅ {m.name}")
        print(f"   Display: {m.display_name}")
        print(f"   Methods: {m.supported_generation_methods}")
        print()

print("\n--- KẾT THÚC ---")
print("\n👉 Sử dụng một trong các model ID ở trên trong code")
