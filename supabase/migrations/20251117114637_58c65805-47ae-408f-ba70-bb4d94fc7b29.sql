-- Enable realtime for leaves table
ALTER TABLE leaves REPLICA IDENTITY FULL;

-- The leaves table is now ready for realtime subscriptions
-- Users can subscribe to changes on their own leave records