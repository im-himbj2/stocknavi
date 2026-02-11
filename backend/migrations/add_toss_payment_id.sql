-- Add toss_payment_id column to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS toss_payment_id VARCHAR UNIQUE;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;
