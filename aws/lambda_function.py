import json
import boto3
import hashlib
import time
import os

s3 = boto3.client('s3')
BUCKET = 'seed-map-data-170377509849'
DATA_KEY = 'breeder_data.json'
SECRET = os.environ.get('TOKEN_SECRET', 'seed-map-ci-2025')
SESSION_DURATION = int(os.environ.get('SESSION_MINUTES', '30')) * 60  # default 30 min

def generate_token():
    """Generate a time-stamped HMAC token."""
    ts = str(int(time.time()))
    sig = hashlib.sha256(f"{SECRET}:{ts}".encode()).hexdigest()[:16]
    return f"{ts}.{sig}"

def validate_token(token):
    """Validate token and check expiry."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return False
        ts, sig = parts
        expected = hashlib.sha256(f"{SECRET}:{ts}".encode()).hexdigest()[:16]
        if sig != expected:
            return False
        elapsed = time.time() - int(ts)
        return elapsed <= SESSION_DURATION
    except:
        return False

def respond(status, body, headers=None):
    h = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Session-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }
    if headers:
        h.update(headers)
    return {'statusCode': status, 'headers': h, 'body': json.dumps(body)}

def lambda_handler(event, context):
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    # CORS preflight
    if method == 'OPTIONS':
        return respond(200, {})

    # Token endpoint
    if path == '/token':
        token = generate_token()
        return respond(200, {'token': token, 'expires_in': SESSION_DURATION})

    # Data endpoint
    if path == '/data':
        token = (event.get('headers') or {}).get('x-session-token') or \
                (event.get('headers') or {}).get('X-Session-Token') or ''

        if not token:
            return respond(401, {'error': 'Missing session token. Request /token first.'})

        if not validate_token(token):
            return respond(403, {'error': 'Session expired or invalid. Request a new /token.'})

        try:
            obj = s3.get_object(Bucket=BUCKET, Key=DATA_KEY)
            data = json.loads(obj['Body'].read().decode('utf-8'))
            return respond(200, data)
        except Exception as e:
            return respond(500, {'error': str(e)})

    return respond(404, {'error': 'Not found. Use /token or /data.'})
