from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt


SECRET_KEY = "jiaoyanzhushou2024"  # 用于JWT编码和解码的密钥
ALGORITHM = "HS256"  # JWT的编码算法
ACCESS_TOKEN_EXPIRE = timedelta(days=1)


def encode_token(msg: str):
    to_encode = {
        "sub": msg, 
        "exp": datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRE
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def get_userid_from_token(token: str):
    try:
        payload = decode_token(token)
        userId: Optional[str] = payload.get("sub")
        return userId
    except jwt.ExpiredSignatureError:
        pass
    except Exception as e:
        print(f"Unknwon error in JWT decode: {e}")
    return None
