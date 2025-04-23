# Housing Cost Calculator #

This is a simple browser-based JS calculator to compare rental costs vs. purchase costs for an apartment or condo over a period of years.
To run, clone this repo and open index.html in a browser. No server needed.
There's also a python version which I originally used to develop the code. I had Claude AI port it over to Javascript (with help).

Live version is at https://housing-cost-calculator.pages.dev/, using Cloudflare Pages.

## Features

- Comparison of renting vs. buying costs over time
- Mortgage and loan calculations
- Property appreciation and tax implications
- Present value discounting
- Adjustable parameters saved to browser localStorage
- Responsive design for desktop and mobile browsers

## For Developers

### Development

You can just open `index.html` in a browser. No server needed.

### Testing

The project uses Jest for unit testing the financial calculations. To run the tests using `bun`:

   ```
   bunx jest
   ```

This will execute all test files matching the pattern `*.test.js` using Jest.

