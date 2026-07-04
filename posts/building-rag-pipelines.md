Retrieval-Augmented Generation looks simple on a whiteboard: embed documents, store vectors, retrieve top-k, stuff them into a prompt. Shipping it to real users is where the interesting problems start. Here are the lessons from packaging a LangChain RAG pipeline (Llama-3 + FAISS) into a FastAPI microservice handling ~500 daily queries.

## 1. Chunking strategy matters more than the model

Most retrieval failures I debugged traced back to bad chunks, not a bad LLM.

- Fixed-size chunks split sentences mid-thought and poison retrieval.
- Recursive splitting on headings/paragraphs kept semantic units intact.
- Small overlap (10–15%) fixed most "answer was in the next chunk" misses.

## 2. Cache aggressively

LLM calls are the expensive part. A Redis layer keyed on normalized queries cut costs dramatically — in a related project, a 7-day cache reduced LLM calls by **50%**.

```python
key = f"rag:{sha256(normalize(query))}"
if cached := redis.get(key):
    return cached
```

## 3. Measure retrieval separately from generation

If you only look at final answers, you can't tell whether retrieval or generation failed. Log the retrieved chunks with every response and spot-check them weekly.

> The model can't answer from context it never received.

## What's next

I'm experimenting with hybrid search (BM25 + dense vectors) and reranking. If that changes the picture, it'll be the next post.
