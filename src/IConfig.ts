export interface IConfig {
    jwtSecret: string,
    database: string,
    ports: {
        http: number,
    },
    host: string
}
