# GenesisGradeLens

See inside your child's grades. GenesisGradeLens is a Chrome extension for families in the
Summit Public Schools (NJ) Genesis parent portal. It shows:

- **Overview**: every course, with the grade Genesis reports next to the grade GenesisGradeLens
  calculates from the assignments.
- **Breakdown**: how each course grade is built (categories, weights, assignment by assignment).
- **Future**: what-if scores for upcoming assignments, and "what do I need on X to get Y?"

## Privacy

- GenesisGradeLens uses the Genesis login you already have open in Chrome. It never asks for or
  stores your password.
- Data stays in your browser. There is no GenesisGradeLens server, and nothing is sent anywhere
  other than Genesis itself.

## Status

Early development: the extension checks your Genesis session; grade views are next.
A phone app (iOS/Android) sharing the same code is planned. See [PLAN.md](PLAN.md).

## Development

```sh
npm install
npm test         # unit tests
npm run build    # builds the extension into dist/
npm run dev      # rebuilds on every change
```

Load it in Chrome: open `chrome://extensions`, turn on **Developer mode**, click
**Load unpacked**, and choose the `dist/` folder. Then click the GenesisGradeLens toolbar button.

GenesisGradeLens is an independent project. It is not affiliated with Genesis Educational Services
or Summit Public Schools.
