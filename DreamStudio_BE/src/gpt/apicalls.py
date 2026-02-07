import json
from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI
from sqlalchemy.orm import Session
from src.config import settings
from src.helpers.db import SessionLocal, get_db
from src.models import goal_schemas
import logging

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

router = APIRouter(prefix="/api/v1/openai", tags=["gpt"])


async def generate_questions(user_input: str, goal_type_id: str, db: Session):

    goal_type = db.get(goal_schemas.GoalType, goal_type_id)
    if goal_type is None:
        logging.warning("Goal Type not found %s", goal_type_id)
        #raise HTTPException(status_code=404, detail="Goal type not found") #what should the status code be?
    
    prompt = goal_type.gpt_prompt  #Make ${count} questions about this text: ${passage}
    question_count = goal_type.question_count
    formatted_prompt = prompt.replace("${count}", str(question_count)).replace("${passage}", user_input)
    resp = await client.responses.create(
        model="gpt-4o-mini",
        input=formatted_prompt,
        text={"format": {"type": "json_object"}},
        temperature=0.2,
        max_output_tokens=256,
        store=False,
    )

    try:
        data = json.loads(resp.output_text)
        questions = [item["question"] for item in data["questions"]]
        answers = [item["answer"] for item in data["questions"]]
        data = {"questions": questions, "answers": answers}
        return data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Model returned invalid JSON: {e}")

    
    
    



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
