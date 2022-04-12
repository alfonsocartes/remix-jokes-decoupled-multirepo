# Remix Jokes Full-Stack Decoupled Multirepo


This project came up to be because of an excellent tutorial made by the [Remix team](https://remix.run/) called [Jokes](https://remix.run/docs/en/v1/tutorials/jokes). 

I wanted to see if I could have a complete app with a decoupled API running on a server and other frontends running on other servers.

In the following example, we have a Remix app that connects to the backend made with Express + PostgreSQL. 

From this project we could also add more frontend apps that share to the same backend like a React Native app, giving us not only a lot of freedom to add, remove or change frontends but deploy each part in different technologies, like having the frontend in mobile app stores.

We could also have the Remix app deployed at the Edge using serverless and the backend in multi regions with replicas for the PostgreSQL DB and then completely change it to a different infrastructure in the future as the project scales and changes requirements.

The project has two parts (you can find a README in each of them):

### Backend

Node Backend deployed in Elastic Beanstalk and RDS:

- Typescript
- Auth Server (JWT with Access and Refresh tokens)
- Redis Server (for refresh tokens blacklist)
- Authenticated routes.
- Prisma
- PostgreSQL DB
- Elastic Beanstalk + RDS deployment (boring and proven)


### Frontends

We have a Remix app that connects to the backend. We can [deploy it to different places](https://remix.run/docs/en/v1/guides/deployment) since it's just a Remix project

- Typescript
- Remix


## How to continue

Please go to each folder and read the README.

### This is not a monorepo.

Because this is not a monorepo, we cannot generate the types for Prisma in the common root node_modules folder that includes @prisma/client. The current solution is to use the remix-jokes-frontend/app/prisma.d.ts file that contains a copy of the generated types but we hace to do this manually. There are multiple solutions for this that include things such as: npm package, git submodule, symlinks, and many more, but we opted for the monorepo solution. You can find it in: [Monorepo Project](https://github.com/alfonsocartes/remix-jokes-decoupled-monorepo)