import autoprefixer from "autoprefixer";
import postcssCustomMedia from "postcss-custom-media";
import postcssNesting from "postcss-nesting";
export default {
  plugins: [postcssCustomMedia, postcssNesting, autoprefixer],
};
