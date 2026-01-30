# 📧 Gmail Email Configuration - Step by Step Guide

This guide will walk you through setting up Gmail to send verification emails for your DeepMatch app.

## ⚠️ Important Notes

- **You CANNOT use your regular Gmail password** - Gmail requires App Passwords for SMTP access
- You MUST enable 2-Factor Authentication (2FA) first
- App Passwords are 16 characters long (no spaces)

---

## 📋 Step-by-Step Instructions

### Step 1: Enable 2-Factor Authentication (2FA)

1. **Go to your Google Account**
   - Open your web browser
   - Go to: https://myaccount.google.com/
   - Sign in with your Gmail account

2. **Navigate to Security Settings**
   - Click on **"Security"** in the left sidebar
   - Or go directly to: https://myaccount.google.com/security

3. **Enable 2-Step Verification**
   - Scroll down to **"How you sign in to Google"** section
   - Find **"2-Step Verification"**
   - Click on it
   - Click **"Get Started"** button

4. **Complete the Setup**
   - Enter your password when prompted
   - Choose your verification method:
     - **Text message (SMS)** - Enter your phone number
     - **Google Authenticator app** - Recommended
     - **Backup codes** - Print or save these
   - Follow the prompts to complete setup
   - You'll receive a verification code - enter it
   - Click **"Turn On"**

✅ **Verification**: You should see "2-Step Verification is On"

---

### Step 2: Generate an App Password

1. **Go to App Passwords Page**
   - While still in Security settings, scroll down
   - Find **"2-Step Verification"** section
   - Click on **"App passwords"**
   - Or go directly to: https://myaccount.google.com/apppasswords

2. **Sign In Again** (if prompted)
   - Google may ask you to verify your identity again

3. **Create App Password**
   - At the top, click the dropdown: **"Select app"**
   - Choose **"Mail"**
   - Click the dropdown: **"Select device"**
   - Choose **"Other (Custom name)"**
   - Type: **"DeepMatch Flask App"** (or any name you prefer)
   - Click **"Generate"**

4. **Copy Your App Password**
   - Google will show you a **16-character password**
   - It looks like: `abcd efgh ijkl mnop` (with spaces)
   - **IMPORTANT**: Copy this password NOW - you won't see it again!
   - Remove the spaces when using it: `abcdefghijklmnop`

✅ **Example App Password**: `abcd efgh ijkl mnop` → Use as `abcdefghijklmnop`

---

### Step 3: Create .env File in Backend Directory

1. **Navigate to Backend Folder**
   ```bash
   cd backend
   ```

2. **Create .env File**
   
   **On Windows (PowerShell):**
   ```powershell
   New-Item -Path .env -ItemType File
   ```
   
   **On Windows (Command Prompt):**
   ```cmd
   type nul > .env
   ```
   
   **On Mac/Linux:**
   ```bash
   touch .env
   ```

3. **Open .env File**
   - Use any text editor (Notepad, VS Code, etc.)
   - Open the `.env` file you just created

4. **Add Your Configuration**
   
   Copy this template and replace with YOUR actual values:
   
   ```env
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USE_SSL=False
   MAIL_USERNAME=your-actual-email@gmail.com
   MAIL_PASSWORD=your-16-character-app-password-no-spaces
   MAIL_DEFAULT_SENDER=your-actual-email@gmail.com
   APP_BASE_URL=http://10.82.196.132:5000
   ```

5. **Fill in Your Values**
   - Replace `your-actual-email@gmail.com` with your Gmail address
   - Replace `your-16-character-app-password-no-spaces` with the App Password from Step 2
   - Keep `APP_BASE_URL` as is (or update if your server IP is different)

✅ **Example .env file:**
```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=john.doe@gmail.com
MAIL_PASSWORD=abcdefghijklmnop
MAIL_DEFAULT_SENDER=john.doe@gmail.com
APP_BASE_URL=http://10.82.196.132:5000
```

---

### Step 4: Verify Your Configuration

1. **Check .env File Location**
   - Make sure `.env` is in the `backend` folder
   - Path should be: `backend/.env`

2. **Check File Format**
   - No quotes around values (unless the value itself contains spaces)
   - No spaces around the `=` sign
   - One setting per line
   - No trailing spaces

3. **Restart Flask Server**
   ```bash
   # Stop your current Flask server (Ctrl+C)
   # Then restart it:
   python app.py
   ```

---

## 🧪 Testing Email Configuration

### Test 1: Check Server Starts Without Errors

When you start Flask, you should see:
```
✅ Using PostgreSQL database
# or
ℹ️ Using SQLite database
```

**If you see email-related errors**, check:
- `.env` file exists in `backend/` folder
- All values are filled in correctly
- No extra spaces or quotes

### Test 2: Register a Test User

1. Open your React Native app
2. Go to Signup screen
3. Register with a test email (use YOUR email to receive the verification)
4. Check your email inbox
5. You should receive a verification email within a few seconds

### Test 3: Check Email Content

The verification email should contain:
- Subject: "Verify Your DeepMatch Account"
- A "Verify Email Address" button
- A verification link

---

## 🐛 Troubleshooting

### Problem: "Authentication failed" or "Invalid credentials"

**Solution:**
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2FA is enabled on your Google account
- Check that the App Password has no spaces in `.env` file
- Regenerate the App Password if needed

### Problem: "Connection refused" or "Cannot connect to SMTP server"

**Solution:**
- Check your internet connection
- Verify `MAIL_SERVER=smtp.gmail.com` is correct
- Check firewall isn't blocking port 587
- Try using port 465 with `MAIL_USE_SSL=True` instead

### Problem: Email not sending, but no error

**Solution:**
- Check Flask server console for error messages
- Verify `.env` file is in the correct location (`backend/.env`)
- Make sure `python-dotenv` is installed: `pip install python-dotenv`
- Restart Flask server after creating/editing `.env`

### Problem: "Less secure app access" error

**Solution:**
- This shouldn't happen with App Passwords
- Make sure you're using App Password, not regular password
- Enable 2FA if you haven't already

### Problem: Can't find "App passwords" option

**Solution:**
- Make sure 2-Step Verification is enabled first
- Wait a few minutes after enabling 2FA
- Try refreshing the page
- Use direct link: https://myaccount.google.com/apppasswords

---

## 🔒 Security Best Practices

1. **Never commit .env to Git**
   - `.env` should be in `.gitignore`
   - Use `.env.example` for templates

2. **Keep App Password Secret**
   - Don't share it with anyone
   - Don't put it in code or comments
   - Regenerate if compromised

3. **Use Different App Passwords**
   - Create separate App Passwords for different apps
   - Name them clearly (e.g., "DeepMatch Production", "DeepMatch Dev")

4. **Regular Updates**
   - Regenerate App Passwords periodically
   - Update `.env` file when you change passwords

---

## ✅ Checklist

Before testing, make sure:

- [ ] 2-Step Verification is enabled on Google account
- [ ] App Password is generated (16 characters)
- [ ] `.env` file created in `backend/` folder
- [ ] All values filled in `.env` (no placeholders)
- [ ] App Password has no spaces in `.env`
- [ ] Flask server restarted after creating `.env`
- [ ] Test registration completed
- [ ] Verification email received

---

## 📞 Need More Help?

- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833
- **Flask-Mail Documentation**: https://pythonhosted.org/Flask-Mail/
- **Check Flask logs**: Look at console output when server starts

---

**You're all set!** Once you complete these steps, your email verification system will be fully functional. 🎉
