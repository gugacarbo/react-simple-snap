module.exports = () => (global.console.color = consolePrettier);

function consolePrettier(
  msg,
  color = "White",
  bgColor = "Black",
  symbol = undefined,
  style = undefined
) {
  const colors = {
    reset: "\x1b[0m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    purple: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  };

  const bgColors = {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    purple: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    gray: "\x1b[100m",
  };

  const fontStyles = {
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
  };

  const mainIcons = {
    info: `${colors.reset}\u{2B55}${colors.reset}`,
    execution: `${colors.reset}\u{1F525}${colors.reset}`,
    success: `${colors.reset}\u{2705}${colors.reset}`,
    warning: `${colors.reset}\u{1F7E1}${colors.reset}`,
    error: `${colors.reset}\u{274C}${colors.reset}`,
    blue: `${colors.reset}\u{1F535}${colors.reset}`,
    red: `${colors.reset}\u{1F534}${colors.reset}`,
    green: `${colors.reset}\u{1F7E2}${colors.reset}`,
    yellow: `${colors.reset}\u{1F7E1}${colors.reset}`,
    white: `${colors.reset}\u{26AA}${colors.reset}`,
  };

  const logSymbols = mainIcons;
  const symbol_ = symbol && logSymbols[symbol] ? logSymbols[symbol] : "";
  const style_ = style && fontStyles[style] ? fontStyles[style] : "";

  console.log(
    `${symbol_} ${style_}${colors[color]}${bgColors[bgColor]} ${msg} ${colors.reset}`
  );
}
