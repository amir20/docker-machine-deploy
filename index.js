const ora = require("ora");

const spinner = ora("Loading unicorns").start();

console.log("This is a test.");
console.log("This is a test.");
console.log("This is a test.");
console.log("This is a test.");
console.log("This is a test.");

setTimeout(() => {
  console.log("Last line.");
  spinner.color = "yellow";
  spinner.text = "Loading rainbows";
}, 1000);
