# How to Check if Cloudinary is Storing Your Images

## ✅ Quick Check Methods

### Method 1: Cloudinary Console (Easiest)

1. **Go to Cloudinary Console**: https://console.cloudinary.com/
2. **Click "Assets"** in the left sidebar (blue diamond icon)
3. **Look for folder**: `deepmatch_media` (your images are stored here)
4. **Or search**: Type any part of your image filename

**Your images should appear here if Cloudinary is working!**

### Method 2: Check Upload Response

When you upload an image through your app, check the response:

```json
{
  "url": "https://res.cloudinary.com/dwk8p2tnr/image/upload/v1234567890/deepmatch_media/xyz.jpg",
  "type": "image",
  "cloudinary": true
}
```

If you see a URL starting with `https://res.cloudinary.com/`, it's stored!

### Method 3: Test Upload Endpoint

You can test directly:

```bash
curl -X POST http://localhost:5000/api/messages/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "type=image"
```

### Method 4: Check Database

Your app stores the Cloudinary URL in the database. Check:
- `User.profile_picture` - profile images
- `Message.media_url` - chat images
- `User.photos` - additional photos

## 🔍 Troubleshooting

### If images aren't showing in Cloudinary:

1. **Check Environment Variables**:
   ```bash
   CLOUDINARY_CLOUD_NAME=dwk8p2tnr
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   ```

2. **Check Upload Logs**:
   - Look for errors in your backend console
   - Check if `upload_result` contains `secure_url`

3. **Verify Folder Structure**:
   - Images should be in: `deepmatch_media/` folder
   - Check console logs for upload success messages

## 📁 Your Current Setup

Based on your code:
- **Folder**: `deepmatch_media`
- **Cloud Name**: `dwk8p2tnr`
- **Upload Endpoint**: `/api/messages/upload`

## 🎯 Quick Test

1. Upload an image through your app
2. Copy the returned URL
3. Paste it in a browser - if it loads, Cloudinary is working!
4. Check Cloudinary Console → Assets → `deepmatch_media` folder
