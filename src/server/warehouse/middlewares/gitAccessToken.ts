import { Request, Response } from 'express';
import { User } from '../../models';
import { IError } from '../../interfaces/IError';
import { terminal } from '../../services/terminal';
import fetch from "node-fetch";
import 'dotenv';

export default async (req: Request, res: Response, next: (param?: unknown) => void): Promise<void | Response<any, Record<string, any>>> => {
  terminal(`Received ${req.method} request at 'gitAccessToken' middleware`);
  // grab code from body
  const { code } = req.body;
  // make make post request to github to get accesstoken
  try {
    const gitClientID = process.env.GITHUB_CLIENT_ID;
    const gitSecret = process.env.GITHUB_SECRET;

    const accessToken = await fetch(`https://github.com/login/oauth/access_token?client_id=${gitClientID}&client_secret=${gitSecret}&code=${code}`,
      {
        method: "POST",
        headers: {
          'Accept': 'application/json',
        }
      }
    ).then((res) => res.json());
    // store token and return next
    res.locals.accessToken = accessToken;
    terminal(`Success: GithubToken received: ${res.locals.accessToken.access_token}`);

    // using token to request for userInfo
    const { access_token, token_type } = res.locals.accessToken;
    const authHeader = `${token_type} ${access_token}`;
    const gitHubData = await fetch(`https://api.github.com/user`,
      {
        method: 'GET',
        headers: {
          "Authorization": authHeader,
        }
      }).then((res => res.json()));
    console.log(`USER DATA IS : `, gitHubData);

    // set up acct info and return next 
    // eslint-disable-next-line prefer-const
    let { name, login, id } = gitHubData;
    const firstName = name.split(' ')[0];
    const lastName = name.split(' ')[1];
    id = id.toString(); 
    const newAcctInfo = {
      firstName,
      lastName,
      username: login,
      password: id,
      darkMode: false,
    };

    res.locals.newAcctInfo = newAcctInfo;
    const { username } = newAcctInfo;
    // checking if acct exist in db 
    terminal(`Searching for user [${username}] in MongoDB`);
    const user = await User.find({ username: username });
    terminal(`Success: MongoDB query executed [${username}]`);
    console.log(user);
    if (user[0]) {
      terminal(`Success: User [${username}] found in DB`);
      res.locals.hasAcct = true;
      res.locals.user = user[0];
      return next();
    }
    else {
      const error: IError = {
        status: 401,
        message: 'Invalid credentials',
        invalid: true
      };
      terminal(`Fail: ${error.message}`);
      res.locals.hasAcct = false;
      return next();
    }
  }
  catch (err) {
    const error: IError = {
      status: 500,
      message: `Unable to fulfill ${req.method} request: ${err}`
    };
    terminal(`Fail: ${error.message}`);
    return res.status(error.status).json(error);
  }
};
