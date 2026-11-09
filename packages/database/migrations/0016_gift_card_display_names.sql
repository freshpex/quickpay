UPDATE gift_products SET brand=replace(brand,' (Sandbox)','') WHERE sandbox_only=true;
