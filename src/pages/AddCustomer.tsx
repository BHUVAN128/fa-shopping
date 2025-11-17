{/* SEARCHABLE PRODUCT SELECT */}
<Popover>
  <PopoverTrigger className="w-full">
    <div className="w-full p-3 rounded-md border text-left bg-white">
      {products.find((p) => p.id === item.productId)?.name ||
        "Select product"}
    </div>
  </PopoverTrigger>

  <PopoverContent className="w-full p-0">
    <Command>
      <CommandInput placeholder="Search products..." className="h-10" />

      <CommandList className="max-h-60 overflow-y-auto">
        <CommandEmpty>No products found.</CommandEmpty>

        {products
          .filter(
            (product) =>
              Number(product.qty) > 0 &&
              product.category !== "__archived__"
          )
          .map((product) => (
            <CommandItem
              key={product.id}
              value={product.name}
              onSelect={() => {
                updateSaleItem(index, "productId", product.id);
              }}
              className="flex justify-between"
            >
              <span>
                {product.name} - ₹{product.price} (Stock: {product.qty})
              </span>

              {item.productId === product.id && (
                <Check className="w-4 h-4 text-green-600" />
              )}
            </CommandItem>
          ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
