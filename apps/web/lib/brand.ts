/** Brand assets on Grove (immutable, verified by hash). Nothing is served from the repo. */
const G = "https://api.grove.storage/";

export const BRAND = {
  /** Wordmark, trimmed to the ink: used as a CSS mask (globals.css `.logo`) and on the pass canvas. */
  logo: `${G}a89cc0e11f378cf3792f9c8962713a7f41e9bd45c2cd9b30bf8274d24582b03a`,
  /** The V monogram in the label blue on black: 16/32/48 ICO, 512 PNG, 180 Apple touch icon. */
  favicon: `${G}3d0c4c675d20ade179f1a3f4a5e6c532224a4049423cd8bab74367a9ae79d132`,
  icon: `${G}aecd9186b16bfffc0ddffca52d4db85a1e35a07d55cd2eefd016cb533dc6a8fc`,
  appleIcon: `${G}e310ebbcc659ee15a1dcd35855cfb5a8e5b098a818b9eceabb9d0ba0abb2244e`,
  /** 1200x630 share card for Open Graph and X. */
  shareCard: `${G}b34b59fb71e7ca2b01e88423be847ccad84aa07ec64694cef7961b11f284abda`,
  shareAlt: "Velvique: la V encendida en azul y el nombre sobre negro.",
} as const;
