import json
from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from src.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

router = APIRouter(prefix="/api/v1/openai", tags=["gpt"])
@router.post("/test")
async def test():
    passage = "Genesis"

    resp = await client.responses.create(
        model="gpt-4o-mini",
        input=f"P:{passage}\n5 TF. >=2 false. short s.",
        text={
            "format": {
                "type": "json_schema",
                "name": "tf5",
                "strict": True,
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "items": {
                            "type": "array",
                            "minItems": 5,
                            "maxItems": 5,
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "s": {"type": "string", "minLength": 1},
                                    "a": {"type": "boolean"},
                                },
                                "required": ["s", "a"],
                            },
                        }
                    },
                    "required": ["items"],
                },
            }
        },
        temperature=0.2,
        max_output_tokens=180,
        store=False,
    )

    try:
        data = json.loads(resp.output_text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Model returned invalid JSON: {e}")

    return {"items": data["items"]}