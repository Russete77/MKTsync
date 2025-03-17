/*
  # Add RLS policies for products table

  1. Security
    - Enable RLS on products table
    - Add policies for authenticated users to:
      - Insert their own products
      - Update their own products
      - Delete their own products
      - Read their own products
*/

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own products
CREATE POLICY "Users can insert their own products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own products
CREATE POLICY "Users can update their own products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own products
CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to read their own products
CREATE POLICY "Users can read their own products"
  ON products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);