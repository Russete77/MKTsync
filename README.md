# MKTsync

MKTsync is a comprehensive marketplace integration platform that helps sellers manage their products across multiple e-commerce marketplaces.

## Features

- Multi-marketplace integration (Mercado Livre, Amazon, Shopify, etc.)
- Centralized product management
- Automated inventory sync
- Sales analytics and reporting
- Multi-language support (English, Spanish, Portuguese)

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Railway

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/MKTsync.git
   cd MKTsync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in your credentials.

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_MERCADOLIVRE_CLIENT_ID`: Your Mercado Livre app client ID
- `VITE_MERCADOLIVRE_CLIENT_SECRET`: Your Mercado Livre app client secret

## Deployment

The project is configured for deployment on Railway. The deployment process is automated through GitHub Actions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.