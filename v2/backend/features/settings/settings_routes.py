import os
import json
import time
import hashlib
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.core.database import get_db_dir

router = APIRouter(prefix="/api")

@router.get('/health')
def health():
    return {"status": "ok"}

class SettingsModel(BaseModel):
    buffer_api_key: Optional[str] = ""
    buffer_channel_id: Optional[str] = ""
    buffer_post_interval: Optional[int] = 24
    cloudinary_cloud_name: Optional[str] = ""
    cloudinary_api_key: Optional[str] = ""
    cloudinary_api_secret: Optional[str] = ""
    fixed_text: Optional[str] = ""

class BufferTestModel(BaseModel):
    buffer_api_key: str

class CloudinaryTestModel(BaseModel):
    cloudinary_cloud_name: str
    cloudinary_api_key: str
    cloudinary_api_secret: str

@router.get('/settings')
def get_settings():
    path = os.path.join(get_db_dir(), 'settings.json')
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {k: (v.strip() if isinstance(v, str) else v) for k, v in data.items()}
                return data
        except Exception:
            pass
    return {
        "buffer_api_key": "",
        "buffer_channel_id": "",
        "buffer_post_interval": 24,
        "cloudinary_cloud_name": "",
        "cloudinary_api_key": "",
        "cloudinary_api_secret": "",
        "fixed_text": "Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın"
    }

@router.post('/settings')
def save_settings(settings: SettingsModel):
    path = os.path.join(get_db_dir(), 'settings.json')
    try:
        settings_dict = {k: (v.strip() if isinstance(v, str) else v) for k, v in settings.dict().items()}
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(settings_dict, f, indent=4, ensure_ascii=False)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ayarlar kaydedilemedi: {str(e)}")

@router.post('/settings/test-buffer')
async def test_buffer(data: BufferTestModel):
    api_key = data.buffer_api_key.strip() if data.buffer_api_key else ""
    if not api_key:
        return {"success": False, "message": "API Key is required."}
    
    async with httpx.AsyncClient() as client:
        # Try GraphQL first
        try:
            resp = await client.post(
                "https://api.buffer.com",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"query": "query { account { id } }"},
                timeout=10.0
            )
            if resp.status_code == 200:
                resp_json = resp.json()
                if "errors" not in resp_json:
                    return {"success": True, "message": "Buffer API key is valid."}
        except Exception:
            pass
        
        # Fallback to legacy REST API
        try:
            resp = await client.get(
                "https://api.bufferapp.com/1/user.json",
                params={"access_token": api_key},
                timeout=10.0
            )
            if resp.status_code == 200:
                return {"success": True, "message": "Buffer API key is valid (Legacy REST)."}
            else:
                try:
                    detail = resp.json().get("message", "Validation failed.")
                except Exception:
                    detail = "Validation failed."
                return {"success": False, "message": f"Buffer API error: {detail}"}
        except Exception as e:
            return {"success": False, "message": f"Connection error: {str(e)}"}

@router.post('/settings/test-cloudinary')
async def test_cloudinary(data: CloudinaryTestModel):
    cloud_name = data.cloudinary_cloud_name.strip() if data.cloudinary_cloud_name else ""
    api_key = data.cloudinary_api_key.strip() if data.cloudinary_api_key else ""
    api_secret = data.cloudinary_api_secret.strip() if data.cloudinary_api_secret else ""
    
    if not cloud_name or not api_key or not api_secret:
        return {"success": False, "message": "All Cloudinary fields are required."}
        
    timestamp = int(time.time())
    to_sign = f"timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()
    
    tiny_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    payload = {
        "file": tiny_image,
        "api_key": api_key,
        "timestamp": timestamp,
        "signature": signature
    }
    
    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, data=payload, timeout=15.0)
            resp_json = resp.json()
            if resp.status_code == 200 and "secure_url" in resp_json:
                return {
                    "success": True,
                    "message": "Cloudinary configuration is valid.",
                    "url": resp_json["secure_url"]
                }
            else:
                error_msg = resp_json.get("error", {}).get("message", "Upload failed.")
                return {"success": False, "message": f"Cloudinary error: {error_msg}"}
        except Exception as e:
            return {"success": False, "message": f"Connection error: {str(e)}"}

from datetime import datetime

class UploadPublishModel(BaseModel):
    video_path: str
    text: str
    schedule_time: Optional[str] = None

async def publish_to_buffer(api_key: str, channel_id: str, text: str, video_url: str, schedule_time: Optional[str] = None):
    async with httpx.AsyncClient() as client:
        # Try GraphQL first
        try:
            mode = "shareNow" if not schedule_time else "customScheduled"
            
            thumbnail_url = None
            if "cloudinary.com" in video_url:
                base, _ = os.path.splitext(video_url)
                thumbnail_url = base + ".jpg"
                
            input_data = {
                "text": text,
                "channelId": channel_id,
                "schedulingType": "automatic",
                "mode": mode,
                "metadata": {
                    "instagram": {
                        "type": "reel",
                        "shouldShareToFeed": True
                    }
                },
                "assets": [
                    {
                        "video": {
                            "url": video_url
                        }
                    }
                ]
            }
            if thumbnail_url:
                input_data["assets"][0]["video"]["thumbnailUrl"] = thumbnail_url
                
            if schedule_time:
                input_data["dueAt"] = schedule_time
                
            mutation = """
            mutation CreatePost($input: CreatePostInput!) {
              createPost(input: $input) {
                ... on PostActionSuccess {
                  post {
                    id
                  }
                }
                ... on MutationError {
                  message
                }
              }
            }
            """
            
            resp = await client.post(
                "https://api.buffer.com",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"query": mutation, "variables": {"input": input_data}},
                timeout=15.0
            )
            if resp.status_code == 200:
                resp_json = resp.json()
                data = resp_json.get("data", {}).get("createPost", {})
                if "post" in data:
                    return {"success": True, "message": "Buffer GraphQL successful."}
                elif "message" in data:
                    return {"success": False, "message": data["message"]}
        except Exception:
            pass
            
        # Fallback to legacy REST API
        try:
            thumbnail_url = None
            if "cloudinary.com" in video_url:
                base, _ = os.path.splitext(video_url)
                thumbnail_url = base + ".jpg"
                
            payload = {
                "text": text,
                "profile_ids[]": channel_id,
                "media[video]": video_url
            }
            if thumbnail_url:
                payload["media[thumbnail]"] = thumbnail_url
                
            if schedule_time:
                if schedule_time.endswith('Z'):
                    dt_str = schedule_time.replace('Z', '+00:00')
                    dt = datetime.fromisoformat(dt_str)
                else:
                    dt = datetime.fromisoformat(schedule_time)
                epoch = int(dt.timestamp())
                payload["scheduled_at"] = epoch
            else:
                payload["now"] = "true"
                
            resp = await client.post(
                "https://api.bufferapp.com/1/updates/create.json",
                params={"access_token": api_key},
                data=payload,
                timeout=15.0
            )
            if resp.status_code == 200:
                return {"success": True, "message": "Buffer REST successful."}
            else:
                try:
                    err_msg = resp.json().get("message", "Validation failed.")
                except Exception:
                    err_msg = f"HTTP {resp.status_code}"
                return {"success": False, "message": f"Buffer API error: {err_msg}"}
        except Exception as e:
            return {"success": False, "message": f"Buffer connection error: {str(e)}"}

class CloudinaryUploadModel(BaseModel):
    video_path: str

class BufferPublishModel(BaseModel):
    text: str
    video_url: str
    schedule_time: Optional[str] = None

@router.post('/settings/upload-cloudinary')
async def upload_cloudinary(data: CloudinaryUploadModel):
    settings_data = get_settings()
    cloudinary_cloud_name = settings_data.get("cloudinary_cloud_name")
    cloudinary_api_key = settings_data.get("cloudinary_api_key")
    cloudinary_api_secret = settings_data.get("cloudinary_api_secret")
    
    if not cloudinary_cloud_name or not cloudinary_api_key or not cloudinary_api_secret:
        raise HTTPException(status_code=400, detail="Cloudinary ayarları eksik. Lütfen ayarlardan yapılandırın.")
        
    if not os.path.exists(data.video_path):
        raise HTTPException(status_code=404, detail="Video dosyası yerel diskte bulunamadı.")
        
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=cloudinary_cloud_name,
        api_key=cloudinary_api_key,
        api_secret=cloudinary_api_secret,
        secure=True
    )
    try:
        upload_result = cloudinary.uploader.upload(data.video_path, resource_type="video")
        video_url = upload_result.get("secure_url")
        if not video_url:
            raise Exception("Cloudinary secure_url dönmedi.")
        return {"success": True, "video_url": video_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary yükleme hatası: {str(e)}")

@router.post('/settings/publish-buffer')
async def publish_buffer(data: BufferPublishModel):
    settings_data = get_settings()
    buffer_api_key = settings_data.get("buffer_api_key")
    buffer_channel_id = settings_data.get("buffer_channel_id")
    
    if not buffer_api_key or not buffer_channel_id:
        raise HTTPException(status_code=400, detail="Buffer ayarları eksik. Lütfen ayarlardan yapılandırın.")
        
    res = await publish_to_buffer(
        buffer_api_key,
        buffer_channel_id,
        data.text,
        data.video_url,
        data.schedule_time
    )
    if res["success"]:
        return {"success": True, "message": res["message"]}
    else:
        raise HTTPException(status_code=500, detail=res["message"])

@router.post('/settings/upload-publish')
async def upload_publish(data: UploadPublishModel):
    settings_data = get_settings()
    buffer_api_key = settings_data.get("buffer_api_key")
    buffer_channel_id = settings_data.get("buffer_channel_id")
    cloudinary_cloud_name = settings_data.get("cloudinary_cloud_name")
    cloudinary_api_key = settings_data.get("cloudinary_api_key")
    cloudinary_api_secret = settings_data.get("cloudinary_api_secret")
    
    if not buffer_api_key or not buffer_channel_id or not cloudinary_cloud_name or not cloudinary_api_key or not cloudinary_api_secret:
        raise HTTPException(status_code=400, detail="Buffer veya Cloudinary ayarları eksik. Lütfen ayarlardan yapılandırın.")
        
    if not os.path.exists(data.video_path):
        raise HTTPException(status_code=404, detail="Video dosyası yerel diskte bulunamadı.")
        
    # Upload to Cloudinary
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=cloudinary_cloud_name,
        api_key=cloudinary_api_key,
        api_secret=cloudinary_api_secret,
        secure=True
    )
    try:
        upload_result = cloudinary.uploader.upload(data.video_path, resource_type="video")
        video_url = upload_result.get("secure_url")
        if not video_url:
            raise Exception("Cloudinary secure_url dönmedi.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary yükleme hatası: {str(e)}")
        
    # Publish/Schedule via Buffer
    res = await publish_to_buffer(
        buffer_api_key,
        buffer_channel_id,
        data.text,
        video_url,
        data.schedule_time
    )
    if res["success"]:
        return {"success": True, "message": res["message"]}
    else:
        raise HTTPException(status_code=500, detail=res["message"])
