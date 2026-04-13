const COLORS = [
  'black', 'white', 'red', 'blue', 'green', 'yellow',
  'grey', 'gray', 'brown', 'orange', 'pink', 'purple',
  'silver', 'gold'
];

const BRANDS = [
  'apple', 'samsung', 'jbl', 'sony', 'hp', 'dell',
  'lenovo', 'xiaomi', 'realme', 'oppo', 'vivo',
  'oneplus', 'boat', 'nike', 'adidas'
];

function extractTags(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return {
    colors: COLORS.filter(c => text.includes(c)),
    brands: BRANDS.filter(b => text.includes(b))
  };
}

module.exports = { extractTags, COLORS, BRANDS };
