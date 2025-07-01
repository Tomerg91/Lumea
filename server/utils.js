export function getNumericUserId(req) {
    const id = req.user?.id;
    if (typeof id === 'number') {
        return id;
    }
    if (typeof id === 'string') {
        return parseInt(id, 10);
    }
    throw new Error('User ID not found or invalid');
}
export function validateWithSchema(schema, data) {
    return schema.parse(data);
}
export function safeParseId(id) {
    if (id === undefined)
        return undefined;
    if (typeof id === 'number')
        return id;
    return parseInt(id, 10);
}
export function safeGet(obj, key) {
    if (obj == null)
        return undefined;
    return obj[key];
}
