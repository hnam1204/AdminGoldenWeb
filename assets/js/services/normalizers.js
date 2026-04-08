function parseBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  return Number(value);
}

function parseInteger(value) {
  return Math.trunc(parseNumber(value));
}

export function normalizePayload(type, formData) {
  switch (type) {
    case "banners":
      return {
        title: formData.title || "",
        desc: formData.desc || "",
        imageUrl: formData.imageUrl || ""
      };
    case "categories":
      return {
        id: parseInteger(formData.id),
        name: formData.name || "",
        key: formData.key || "",
        imageUrl: formData.imageUrl || "",
        isActive: parseBoolean(formData.isActive)
      };
    case "news":
      return {
        title: formData.title || "",
        description: formData.description || "",
        content: formData.content || "",
        imageUrl: formData.imageUrl || "",
        type: formData.type || "news",
        date: formData.date ? new Date(formData.date) : new Date()
      };
    case "products":
      return {
        id: parseInteger(formData.id),
        name: formData.name || "",
        description: formData.description || "",
        price: parseNumber(formData.price),
        imageUrl: formData.imageUrl || "",
        categoryId: parseInteger(formData.categoryId),
        categoryName: formData.categoryName || "",
        categoryKey: formData.categoryKey || "",
        isAvailable: parseBoolean(formData.isAvailable)
      };
    case "users":
      return {
        id: formData.id || "",
        fullName: formData.fullName || "",
        email: formData.email || "",
        phone: formData.phone || "",
        address: formData.address || "",
        avatar: formData.avatar || "",
        role: formData.role || "customer",
        points: parseInteger(formData.points)
      };
    default:
      return formData;
  }
}
