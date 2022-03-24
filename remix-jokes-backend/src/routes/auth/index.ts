import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import express, { NextFunction, Request, Response } from "express";
import { db } from "../../db.server";
import type { User } from "@prisma/client";
import redisClient from "../../redis_client";

declare module "jsonwebtoken" {
  export interface UserIDJwtPayload extends jwt.JwtPayload {
    userId: string;
  }
}

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const redisRefreshTokensBlacklist = redisClient;

const router = express.Router();

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
if (!accessTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET must be set");
}

const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!refreshTokenSecret) {
  throw new Error("REFRESH_TOKEN_SECRET must be set");
}

// Authentication Middleware
async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(422)
        .send({ message: "Username and password must be provided" });
    }

    const user: User | null = await db.user.findUnique({
      where: { username },
    });

    if (user) {
      const isCorrectPassword = await bcrypt.compare(
        password,
        user.passwordHash
      );
      if (isCorrectPassword) {
        req.user = user;
        next();
      } else {
        return res.status(403).json({ message: "Error: incorrect password" });
      }
    } else {
      return res.status(403).json({ message: "Error: user doesn't exists" });
    }
  } catch (error) {
    return res.status(403).json({ message: "Error: database error" });
  }
}

function generateAccessToken(userId: string) {
  const payload = { userId };
  const options = {
    expiresIn: "30m",
    issuer: "[APPNAME, DOMAIN, ...]",
    audience: userId,
  };

  if (!accessTokenSecret) {
    throw new Error("ACCESS_TOKEN_SECRET must be set");
  }
  return jwt.sign(payload, accessTokenSecret, options);
}

function generateRefreshToken(userId: string) {
  const payload = { userId };
  const options = {
    expiresIn: "1y",
    issuer: "[APPNAME, DOMAIN, ...]",
    audience: userId,
  };
  if (!refreshTokenSecret) {
    throw new Error("REFRESH_TOKEN_SECRET must be set");
  }
  return jwt.sign(payload, refreshTokenSecret, options);
}

// params: username, password in req.body
router.post("/login", authenticateUser, async (req: Request, res: Response) => {
  // The frontend should check if the has a cookie with the tokens before making this call, if it has them, then it's already logged in

  // We get the user id from the middleware
  const userId = req.user.id;

  try {
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    if (accessToken && refreshToken) {
      // Delete from blacklist if it had it
      await redisRefreshTokensBlacklist.DEL(userId);
      res
        .status(200)
        .json({ accessToken: accessToken, refreshToken: refreshToken });
    } else {
      res.status(500).json({ message: "Error: could not generate tokens" });
    }
  } catch (error) {
    res.status(500).json({ message: "Authorization token not found." });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  console.log("registering", req.body);
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(422)
        .send({ message: "Username and password must be provided" });
    }

    console.log("checking is user exists....");
    const userExists = await db.user.findFirst({
      where: { username },
    });

    console.log("user exists: ", userExists);

    if (userExists) {
      return res.status(422).send({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    console.log("passwordHash", passwordHash);
    const user: User = await db.user.create({
      data: { username, passwordHash },
    });

    console.log("user created", user);

    if (user?.id) {
      return res.status(200).json({ user });
    } else {
      return res
        .status(422)
        .send({ message: "Error creating user in the database" });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Error creating user" });
  }
});

// Route to create a new access token if the user has a valid refresh token
router.post("/token", async (req: Request, res: Response) => {
  // TODO: Shouldn't we get the refresh token from the cookie sent by the client?
  const refreshToken = req.body.refreshToken;

  if (refreshToken === null) return res.sendStatus(401);

  try {
    const payload = <jwt.UserIDJwtPayload>(
      jwt.verify(refreshToken, refreshTokenSecret)
    );
    const response = await redisRefreshTokensBlacklist.GET(payload.userId);
    if (response === null) {
      // Token has not been found
      const accessToken = generateAccessToken(payload.userId);
      return res
        .status(200)
        .json({ accessToken: accessToken, refreshToken: refreshToken });
    }
    return res.status(403).json({ message: "Error: please log in again" });
  } catch (error) {
    return res.status(403).json({ message: (error as Error).message });
  }
});

router.delete("/logout", async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (refreshToken === null) return res.sendStatus(401);

  try {
    const payload = <jwt.UserIDJwtPayload>(
      jwt.verify(refreshToken, refreshTokenSecret)
    );

    // If we have a valid refresh token, we can add it to the Redis blacklist for 1y
    const timeout = 365 * 24 * 60 * 60;

    const response = await redisRefreshTokensBlacklist.SET(
      payload.userId,
      refreshToken
    );
    await redisClient.expire(payload.userId, timeout);
    if (response) {
      return res
        .status(200)
        .json({ message: "Successfully logged out manually" });
    }
  } catch (error) {
    return res.status(403).json({ message: (error as Error).message });
  }
});

export function authorizationRequired(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  if (!accessTokenSecret) {
    res.status(500).json({ message: "Authorization token not found." });
  } else {
    jwt.verify(token, accessTokenSecret, (err, payload) => {
      // if the client gets back a 401, it needs to refresh the access token with the refresh token using the /token route
      if (err) {
        console.error(err.message);
        return res.sendStatus(401);
      }
      req.user = payload;
      next();
    });
  }
}

router.get("/test", authorizationRequired, (req, res) => {
  res.status(200).json({ message: "Authorized" });
});

export default router;
