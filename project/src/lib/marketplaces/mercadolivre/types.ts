export interface MercadoLivreCategory {
  id: string;
  name: string;
  path_from_root: Array<{
    id: string;
    name: string;
  }>;
}

export interface MercadoLivreListing {
  id: string;
  site_id: string;
  title: string;
  seller_id: number;
  category_id: string;
  official_store_id: number | null;
  price: number;
  base_price: number;
  original_price: number | null;
  currency_id: string;
  initial_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  sale_terms: Array<{
    id: string;
    name: string;
    value_id: string;
    value_name: string;
  }>;
  buying_mode: string;
  listing_type_id: string;
  condition: string;
  permalink: string;
  thumbnail: string;
  secure_thumbnail: string;
  pictures: Array<{
    id: string;
    url: string;
    secure_url: string;
    size: string;
    max_size: string;
    quality: string;
  }>;
  video_id: string | null;
  descriptions: Array<{
    id: string;
  }>;
  accepts_mercadopago: boolean;
  non_mercado_pago_payment_methods: Array<{
    id: string;
    description: string;
    type: string;
  }>;
  shipping: {
    mode: string;
    methods: Array<any>;
    tags: Array<string>;
    dimensions: string | null;
    local_pick_up: boolean;
    free_shipping: boolean;
    logistic_type: string;
    store_pick_up: boolean;
  };
  international_delivery_mode: string;
  seller_address: {
    city: {
      id: string;
      name: string;
    };
    state: {
      id: string;
      name: string;
    };
    country: {
      id: string;
      name: string;
    };
    search_location: {
      neighborhood: {
        id: string;
        name: string;
      };
      city: {
        id: string;
        name: string;
      };
      state: {
        id: string;
        name: string;
      };
    };
    latitude: number;
    longitude: number;
  };
  seller_contact: null;
  location: {};
  coverage_areas: Array<any>;
  attributes: Array<{
    id: string;
    name: string;
    value_id: string | null;
    value_name: string;
    value_struct: null;
    values: Array<{
      id: string | null;
      name: string;
      struct: null;
    }>;
    attribute_group_id: string;
    attribute_group_name: string;
  }>;
  warnings: Array<any>;
  listing_source: string;
  variations: Array<{
    id: number;
    price: number;
    attribute_combinations: Array<{
      id: string;
      name: string;
      value_id: string;
      value_name: string;
    }>;
    available_quantity: number;
    sold_quantity: number;
    picture_ids: Array<string>;
  }>;
  status: string;
  sub_status: Array<any>;
  tags: Array<string>;
  warranty: string;
  catalog_product_id: string | null;
  domain_id: string;
  parent_item_id: string | null;
  differential_pricing: null;
  deal_ids: Array<any>;
  automatic_relist: boolean;
  date_created: string;
  last_updated: string;
  health: number;
  catalog_listing: boolean;
}