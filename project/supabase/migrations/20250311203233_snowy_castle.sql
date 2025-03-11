/*
  # Separate Projects Database Structure

  This migration separates the existing tables into two distinct projects:
  1. MKTsync (Marketplace Integration)
  2. Boat Rental Platform

  1. Changes
    - Move boat rental tables to a new schema
    - Update foreign key relationships
    - Maintain existing data
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Update schema permissions
*/

-- Create new schema for boat rental platform
CREATE SCHEMA IF NOT EXISTS boat_rental;

-- Move boat-related tables to new schema
ALTER TABLE boats SET SCHEMA boat_rental;
ALTER TABLE boat_availabilities SET SCHEMA boat_rental;
ALTER TABLE provider_settings SET SCHEMA boat_rental;
ALTER TABLE provider_payouts SET SCHEMA boat_rental;
ALTER TABLE experiences SET SCHEMA boat_rental;
ALTER TABLE bookings SET SCHEMA boat_rental;
ALTER TABLE reviews SET SCHEMA boat_rental;
ALTER TABLE favorites SET SCHEMA boat_rental;
ALTER TABLE provider_performance_metrics SET SCHEMA boat_rental;
ALTER TABLE analytics_daily_metrics SET SCHEMA boat_rental;

-- Update foreign key relationships for boat rental tables
ALTER TABLE boat_rental.boat_availabilities 
  DROP CONSTRAINT IF EXISTS boat_availabilities_boat_id_fkey,
  ADD CONSTRAINT boat_availabilities_boat_id_fkey 
    FOREIGN KEY (boat_id) REFERENCES boat_rental.boats(id);

ALTER TABLE boat_rental.bookings 
  DROP CONSTRAINT IF EXISTS bookings_experience_id_fkey,
  ADD CONSTRAINT bookings_experience_id_fkey 
    FOREIGN KEY (experience_id) REFERENCES boat_rental.experiences(id);

ALTER TABLE boat_rental.reviews 
  DROP CONSTRAINT IF EXISTS reviews_experience_id_fkey,
  ADD CONSTRAINT reviews_experience_id_fkey 
    FOREIGN KEY (experience_id) REFERENCES boat_rental.experiences(id);

ALTER TABLE boat_rental.favorites 
  DROP CONSTRAINT IF EXISTS favorites_experience_id_fkey,
  ADD CONSTRAINT favorites_experience_id_fkey 
    FOREIGN KEY (experience_id) REFERENCES boat_rental.experiences(id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA boat_rental TO authenticated;
GRANT USAGE ON SCHEMA boat_rental TO anon;

-- Update RLS policies for boat rental tables
ALTER TABLE boat_rental.boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_rental.boat_availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_rental.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_rental.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_rental.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_rental.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_rental.provider_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_rental.analytics_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes for improved performance
CREATE INDEX IF NOT EXISTS idx_boats_owner_id ON boat_rental.boats(owner_id);
CREATE INDEX IF NOT EXISTS idx_boat_availabilities_boat_date ON boat_rental.boat_availabilities(boat_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON boat_rental.bookings(user_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_reviews_experience ON boat_rental.reviews(experience_id);

-- Add comment to clarify schema purpose
COMMENT ON SCHEMA boat_rental IS 'Schema for boat rental platform tables and functionality';
COMMENT ON SCHEMA public IS 'Schema for marketplace integration (MKTsync) tables and functionality';