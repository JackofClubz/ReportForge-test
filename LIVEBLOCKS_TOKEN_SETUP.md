# Liveblocks Token-Based Authentication Setup

This document explains how to set up token-based authentication for Liveblocks collaboration features in ReportForge.

## Prerequisites

1. A Liveblocks account with a secret key
2. Supabase project with Edge Functions enabled

## Environment Variables Setup

### 1. Get Your Liveblocks Secret Key

1. Go to [Liveblocks Dashboard](https://liveblocks.io/dashboard)
2. Select your project
3. Go to **Settings** → **API Keys**
4. Copy the **Secret Key** (starts with `sk_`)

### 2. Set Environment Variables

Add the following environment variable to your system:

```bash
# Add to your ~/.bashrc, ~/.zshrc, or system environment
export LIVEBLOCKS_SECRET_KEY="sk_your_actual_secret_key_here"
```

Or for local development, you can set it temporarily:

```bash
export LIVEBLOCKS_SECRET_KEY="sk_your_actual_secret_key_here"
```

### 3. Verify Supabase Configuration

The `supabase/config.toml` file should include:

```toml
[edge_runtime.secrets]
LIVEBLOCKS_SECRET_KEY = "env(LIVEBLOCKS_SECRET_KEY)"
```

## Testing the Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Check for these logs in the console:**
   - `🔧 [LIVEBLOCKS] Setting up LiveblocksProvider with token authentication`
   - `🔐 [TOKEN-SERVICE] Requesting Liveblocks token for user: [user-id]`
   - `✅ [TOKEN-SERVICE] Successfully received token for user: [name]`

3. **Test collaboration features:**
   - Open a report in the editor
   - Check that user presence is working
   - Try typing `@` to test mention suggestions

## Troubleshooting

### Error: "Missing LIVEBLOCKS_SECRET_KEY environment variable"
- Make sure the environment variable is set correctly
- Restart your terminal/development server after setting the variable

### Error: "Authentication required to get Liveblocks token"
- Make sure you're logged into the ReportForge application
- Check that your Supabase session is valid

### Error: "Failed to get Liveblocks token"
- Verify your secret key is correct and starts with `sk_`
- Check that the Supabase Edge Function is deployed and working

## Security Notes

- **Never commit your secret key to version control**
- The secret key should only be used server-side (in Supabase Edge Functions)
- Users will receive temporary tokens that expire after 24 hours
- Tokens are cached client-side to avoid unnecessary requests

## Benefits of Token-Based Authentication

✅ **Enhanced Security**: Server-side user validation  
✅ **Role-Based Permissions**: Different access levels for admins, editors, viewers  
✅ **Room-Level Access Control**: Users only access reports they're authorized for  
✅ **User Metadata**: Proper user names, avatars, and colors in collaboration  
✅ **Production Ready**: Scalable authentication for enterprise deployment

## Migration from Public Key

The system has been upgraded from public key authentication to token-based authentication. The old public key method is no longer used, providing better security and user management. 