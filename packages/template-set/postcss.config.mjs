import postcssMixins from "postcss-mixins";
import autoprefixer from "autoprefixer";
import postcssCustomMedia from "postcss-custom-media";
import postcssNesting from "postcss-nesting";

export default {
  plugins: [postcssMixins, postcssCustomMedia, postcssNesting, autoprefixer],
};