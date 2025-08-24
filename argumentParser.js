// argumentParser.js

function resolve(value, context) {
    if (typeof value === 'string') {
        // Match standalone variables like "${variable}"
        const standaloneVarMatch = value.match(/^\$\{(.*)\}$/);
        if (standaloneVarMatch) {
            const varName = standaloneVarMatch[1];
            return context[varName] !== undefined ? context[varName] : value;
        }

        // Match inline variables like "some_string_${variable}"
        return value.replace(/\$\{(.*?)\}/g, (match, varName) => {
            return context[varName] !== undefined ? context[varName] : match;
        });
    }

    if (Array.isArray(value)) {
        return value.map(item => resolve(item, context));
    }

    if (typeof value === 'object' && value !== null) {
        const newObj = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                newObj[key] = resolve(value[key], context);
            }
        }
        return newObj;
    }

    return value;
}

function resolveArguments(args, context) {
    if (!Array.isArray(args)) {
        return args;
    }
    return args.map(arg => resolve(arg, context));
}

export { resolveArguments };