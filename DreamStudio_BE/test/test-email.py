import boto3
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env.dev"))

_ses = boto3.client(
    "ses",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
)

response = _ses.send_email(
    Source="no-reply@goalstudioapp.com",
    Destination={"ToAddresses": ["kjh9643@gmail.com"]},
    Message={
        "Subject": {"Data": "SES Test Email"},
        "Body": {
            "Html": {
                "Data": "<h1>Test</h1><p>If you see this, SES works.</p>"
            }
        },
    },
)

print(response)