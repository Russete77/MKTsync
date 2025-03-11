/*
  # Add sales statistics tables

  1. New Tables
    - `sales_metrics`
      - Daily/monthly sales tracking
      - Revenue metrics
      - Order statistics
      - Performance indicators

  2. Changes
    - Add sales tracking capabilities
    - Enable analytics for sales performance

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS sales_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL,
  total_sales numeric(10,2) DEFAULT 0,
  total_orders integer DEFAULT 0,
  average_order_value numeric(10,2) DEFAULT 0,
  revenue_growth_rate numeric(5,2) DEFAULT 0,
  top_selling_products jsonb DEFAULT '[]'::jsonb,
  marketplace_performance jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX sales_metrics_user_date_idx ON sales_metrics (user_id, date);

ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales metrics"
  ON sales_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales metrics"
  ON sales_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sales_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_metrics_updated_at
  BEFORE UPDATE ON sales_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_metrics_updated_at();