export function parseIncludeArgs(args) {
    const [title, ...parameters] = args.split(',');
    const options = {};
    for (const parameter of parameters) {
        const [key, value] = parameter.split('=');
        if (value !== undefined) options[key.trim()] = value.trim();
    }
    return { title: title.trim(), options };
}
