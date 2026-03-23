import asyncio
from backend.api.main import list_vendors

async def test():
    try:
        res = await list_vendors()
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
