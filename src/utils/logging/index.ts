import { cyan, red, green } from 'cli-color';
import { SentryService } from '../sentry/';
const sentryServ = new SentryService();
const addLeadZero = (num) => {
  if (num < 10) return `0${num}`;
  return `${num}`;
};

const getTime = () => {
  const a = new Date(),
    hour = addLeadZero(a.getHours()),
    min = addLeadZero(a.getMinutes()),
    sec = addLeadZero(a.getSeconds());
  return `${hour}:${min}:${sec}`;
};

const getDate = () => {
  const a = new Date(),
    year = a.getFullYear(),
    month = addLeadZero(a.getMonth() + 1),
    date = addLeadZero(a.getDate());
  return `${year}-${month}-${date}`;
};

const logLevel = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

const log = (message, level = logLevel.INFO) => {
  if (level === logLevel.ERROR) {
    message = message?.stack || message;
    level = red(level);
    sentryServ.instance().captureException(message);
  } else {
    level = green(level);
  }

  const rawMsgs = Array.isArray(message) ? message : [message],
    msgs = [];
  for (const msg of rawMsgs) {
    try {
      if (typeof msg !== 'string') {
        msgs.push(JSON.stringify(msg));
      } else {
        msgs.push(msg);
      }
      sentryServ.instance().setContext('Escrow', msgs);
    } catch (e) {
      console.error(red(e));
      sentryServ.instance().captureException(e);
    }
  }

  console.log(cyan(`[${cyan(getDate())} ${getTime()}]`) + ` ${level}:`, ...msgs);
};

export { log, logLevel as level };
