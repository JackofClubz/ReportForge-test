# 📧 Supabase Email Configuration Guide

Your password reset feature is working, but emails aren't being sent because Supabase email isn't configured. Here's how to fix it:

## 🚨 **The Problem**

From your logs, I can see:
✅ **POST to `/auth/v1/recover` returned 200** - Request successful  
❌ **No email sent** - SMTP not configured  

This means Supabase **accepted** the reset request but **couldn't send** the email.

## 🛠️ **Solution Options**

### **Option A: Quick Fix - Gmail SMTP (Recommended for Development)**

#### **Step 1: Enable App Passwords in Gmail**
1. Go to **https://myaccount.google.com/**
2. Click **Security** → **2-Step Verification**
3. Scroll down to **App passwords**
4. Generate password for "Mail"
5. **Copy the 16-character password**

#### **Step 2: Configure Supabase**
1. Go to **Supabase Dashboard** → Your Project
2. **Authentication** → **Settings**
3. Scroll to **SMTP Settings**
4. Configure:

```
Enable custom SMTP: ✅ ON
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-gmail@gmail.com
SMTP Pass: [16-character app password]
```

#### **Step 3: Test**
1. Save settings
2. Try password reset in your app
3. Check your email inbox

---

### **Option B: Mailtrap (Best for Development)**

**Mailtrap** catches emails without sending them - perfect for testing!

#### **Step 1: Create Mailtrap Account**
1. Go to **https://mailtrap.io/**
2. Sign up for free account
3. Create new inbox

#### **Step 2: Get SMTP Credentials**
In your Mailtrap inbox, you'll see:
```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Username: [your-username]
Password: [your-password]
```

#### **Step 3: Configure Supabase**
```
Enable custom SMTP: ✅ ON
SMTP Host: sandbox.smtp.mailtrap.io
SMTP Port: 2525
SMTP User: [mailtrap-username]
SMTP Pass: [mailtrap-password]
```

#### **Benefits:**
✅ **Safe Testing** - No real emails sent  
✅ **Email Preview** - See exactly what users receive  
✅ **Free Tier** - 100 emails/month  

---

### **Option C: SendGrid (Production Ready)**

For production, use a dedicated email service:

#### **Step 1: Create SendGrid Account**
1. Go to **https://sendgrid.com/**
2. Sign up (free tier: 100 emails/day)
3. Verify your account

#### **Step 2: Create API Key**
1. **Settings** → **API Keys**
2. Create new API key with "Full Access"
3. Copy the API key

#### **Step 3: Configure Supabase**
```
Enable custom SMTP: ✅ ON
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: [your-sendgrid-api-key]
```

---

## 🧪 **Development Helper (Immediate Testing)**

While configuring email, use our **development helper**:

### **How It Works:**
1. Try password reset in your app
2. Check browser console
3. You'll see manual reset link for testing
4. Copy and open the link to test reset flow

### **Console Output:**
```
🛠️  [DEV] Email Configuration Issue - Manual Reset Link
📧 Email requested for: user@example.com
🔗 Manual reset link (development only):
http://localhost:3001/auth/reset-password?access_token=...

📋 Instructions:
1. Copy the link above
2. Open it in a new tab  
3. Test the password reset flow
```

---

## 🔧 **Debugging Email Issues**

### **Check Supabase Logs**
1. **Supabase Dashboard** → **Logs**
2. Look for authentication events
3. Check for SMTP errors

### **Common Issues:**

#### **🚨 Issue: "Invalid SMTP credentials"**
**Solution:** Double-check username/password

#### **🚨 Issue: "Connection timeout"**
**Solution:** Check port (587 for TLS, 465 for SSL)

#### **🚨 Issue: "Authentication failed"** 
**Solution:** 
- Gmail: Use app password, not regular password
- SendGrid: Use "apikey" as username

#### **🚨 Issue: Emails going to spam**
**Solution:** Configure SPF/DKIM records (production)

---

## ✅ **Testing Your Configuration**

### **Step 1: Request Password Reset**
```bash
1. Go to /login
2. Click "Forgot your password?"
3. Enter email and submit
4. Check console for debug logs
```

### **Step 2: Check Email Service**
- **Gmail**: Check inbox + spam folder
- **Mailtrap**: Check Mailtrap inbox dashboard  
- **SendGrid**: Check SendGrid activity logs

### **Step 3: Verify Reset Flow**
```bash
1. Click reset link in email
2. Should redirect to /auth/reset-password
3. Enter new password
4. Should redirect to login with success message
```

---

## 🎯 **Recommended Setup by Environment**

### **Development**
```
🥇 Best: Mailtrap (safe testing)
🥈 Good: Gmail SMTP (real emails)
🥉 Backup: Development helper (manual links)
```

### **Staging**
```
🥇 Best: SendGrid (reliable)
🥈 Good: Gmail SMTP (limited)
```

### **Production**
```
🥇 Best: SendGrid/AWS SES (scalable)
🥈 Good: Custom SMTP provider
❌ Never: Gmail SMTP (rate limits)
```

---

## 🚀 **Quick Start Commands**

### **1. Test Current Setup**
```bash
# In your browser console after trying password reset:
# Look for: "✅ [AUTH] Password reset email request successful"
```

### **2. Enable Development Helper**
```bash
# Already configured! Just try password reset and check console
npm run dev
```

### **3. Verify Configuration**
```bash
# Check Supabase dashboard
1. Authentication → Settings
2. Scroll to SMTP Settings  
3. Ensure "Enable custom SMTP" is ON
```

---

## 🎉 **Success Indicators**

### **Email Configured Correctly:**
✅ Reset email received in inbox  
✅ Reset link redirects to your app  
✅ Password update works  
✅ Login with new password succeeds  

### **Still Having Issues:**
❌ No email received after 5 minutes  
❌ Console shows SMTP errors  
❌ Reset link gives 404 error  

---

## 🆘 **Need Help?**

### **Quick Fixes:**
1. **Try Mailtrap first** - easiest setup
2. **Check spam folder** - emails often end up there
3. **Use development helper** - bypass email entirely
4. **Verify SMTP credentials** - double-check copy/paste

### **Still Stuck?**
1. Check Supabase logs for SMTP errors
2. Test with different email service
3. Contact Supabase support for email limits

---

**Once email is configured, your password reset will work perfectly! 📧✨** 