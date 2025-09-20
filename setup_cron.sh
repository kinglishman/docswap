#!/bin/bash

# Setup script for automated Supabase provider monitoring
# This script sets up a daily cron job to monitor Supabase providers

echo "Setting up automated Supabase provider monitoring..."

# Get the current directory
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create a temporary cron file
TEMP_CRON="/tmp/supabase_cron_temp"

# Get existing crontab (if any)
crontab -l > "$TEMP_CRON" 2>/dev/null || echo "" > "$TEMP_CRON"

# Add our monitoring job (runs daily at 9 AM)
echo "# Supabase Provider Monitor - runs daily at 9 AM" >> "$TEMP_CRON"
echo "0 9 * * * cd $CURRENT_DIR && python3 monitor_supabase_providers.py >> supabase_monitor.log 2>&1" >> "$TEMP_CRON"

# Install the new crontab
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "✅ Cron job installed successfully!"
echo "📅 Monitoring will run daily at 9:00 AM"
echo "📝 Logs will be saved to: $CURRENT_DIR/supabase_monitor.log"
echo ""
echo "To verify the cron job was installed:"
echo "  crontab -l"
echo ""
echo "To remove the cron job later:"
echo "  crontab -e"
echo "  (then delete the Supabase monitor line)"

# Make the script executable
chmod +x "$0"

echo ""
echo "🔧 Manual setup alternative:"
echo "If you prefer to set up manually, run: crontab -e"
echo "Then add this line:"
echo "0 9 * * * cd $CURRENT_DIR && python3 monitor_supabase_providers.py >> supabase_monitor.log 2>&1"