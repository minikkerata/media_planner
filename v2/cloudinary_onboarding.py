import cloudinary
import cloudinary.uploader
import cloudinary.api

# 1. Configure Cloudinary
cloudinary.config(
    cloud_name="dq47sy2vk",
    api_key="867839665164349",
    api_secret="YVVy8N77VbZC7C5TDXDCh-yR-4w",
    secure=True
)

# 2. Upload an image
# Upload a sample image from Cloudinary's demo domains
sample_url = "https://res.cloudinary.com/demo/image/upload/sample.jpg"
print("Uploading image from:", sample_url)

upload_result = cloudinary.uploader.upload(sample_url)
secure_url = upload_result.get("secure_url")
public_id = upload_result.get("public_id")

print("Upload Success!")
print("Secure URL:", secure_url)
print("Public ID:", public_id)

# 3. Get image details
# Fetch metadata about the uploaded image
details = cloudinary.api.resource(public_id)
width = details.get("width")
height = details.get("height")
format = details.get("format")
bytes_size = details.get("bytes")

print("\nImage Details:")
print("Width:", width)
print("Height:", height)
print("Format:", format)
print("File Size (bytes):", bytes_size)

# 4. Transform the image
# Generate optimized transformed URL
# f_auto (fetch_format="auto") automatically selects the most efficient image format (e.g., AVIF, WebP) depending on browser support.
# q_auto (quality="auto") automatically compresses the image to optimize file size while preserving high visual quality.
transformed_url = cloudinary.utils.cloudinary_url(
    public_id,
    fetch_format="auto",
    quality="auto",
    secure=True
)[0]

print("\nDone! Click link below to see optimized version of the image. Check the size and the format.")
print(transformed_url)
