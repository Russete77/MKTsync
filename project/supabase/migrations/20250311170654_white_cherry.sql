/*
  # Add RLS policies for sales metrics table

  1. Security Changes
    - Enable RLS on sales_metrics table
    - Add policies for:
      - Inserting new metrics (authenticated users)
      - Reading own metrics (authenticated users)
      - Updating own metrics (authenticated users)

  2. Notes
    - Users can only access their own metrics
    - Authentication is required for all operations
*/

-- Enable RLS
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new metrics
CREATE POLICY "Users can insert their own metrics"
  ON sales_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for reading metrics
CREATE POLICY "Users can read their own metrics"
  ON sales_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for updating metrics
CREATE POLICY "Users can update their own metrics"
  ON sales_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);