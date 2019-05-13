export interface IConfig {
    jwtSecret: string,
    database: string,
    ports: {
        http: number,
        https: number
    },
    host: string
}
