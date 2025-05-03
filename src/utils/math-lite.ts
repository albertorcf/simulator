import { create, all, MathJsInstance, ConfigOptions } from 'mathjs';

const config: ConfigOptions = {
  number: 'number',
  precision: 14
};

const math = create(all, config) as MathJsInstance;

export default math;
