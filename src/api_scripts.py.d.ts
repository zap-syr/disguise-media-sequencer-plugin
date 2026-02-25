// Auto-generated from hello_world by vite-plugin-designer-python-loader
import { AxiosResponse } from 'axios';
import { PythonApiClient, ExecuteResponse, RegisterResponse } from '@disguise-one/designer-pythonapi';

export type addTextLayerFunction = () => Promise<ExecuteResponse>;

export declare const hello_world: (directorEndpoint: string) => {
  client: PythonApiClient,
  registration: Promise<AxiosResponse<RegisterResponse>>,
  addTextLayer: addTextLayerFunction
};
