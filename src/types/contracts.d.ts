declare module '*.json' {
  const value: {
    abi: any[];
    bytecode: string;
    [key: string]: any;
  };
  export default value;
}