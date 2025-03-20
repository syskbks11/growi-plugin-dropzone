import React from 'react';

import { GROWI } from '@goofmint/growi-js';
import { h, Properties } from 'hastscript';
import type { Plugin } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';

// import { getReactHooks } from '../react-hooks';

import './Hello.css';

const growi = new GROWI();

declare const growiFacade : {
  react: typeof React,
};

export const helloGROWI = (Tag: React.FunctionComponent<any>): React.FunctionComponent<any> => {
  return ({ children, ...props }) => {
    try {
      const { dropzone } = JSON.parse(props.title);
      if (dropzone) {
        const { react } = growiFacade;
        const { useEffect, useCallback, useState } = react;
        const [isDragOver, setIsDragOver] = useState(false);
        const pageId = window.location.pathname.split('/').pop();
        const edit = window.location.hash.includes('edit');
        const onDrop = useCallback(async(event: React.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          if (edit) return;
          const { files } = event.dataTransfer;
          if (files.length === 0) return;
          const page = await growi.page({ pageId });
          const promises = [];
          for (const file of files) {
            promises.push(page.upload(file.name, file as any));
          }
          const attachments = await Promise.all(promises);
          const result = attachments.map((attachment) => {
            return attachment.fileFormat?.split('/')[0] === 'image'
              ? `![${attachment.fileName}](${attachment.filePathProxied})`
              : `[${attachment.fileName}](${attachment.filePathProxied})`;
          });
          const contents = await page.contents();
          const newContents = `${contents}\n${result.join('\n')}`;
          await page.contents(newContents);
          await page.save();
          setIsDragOver(false);
          window.location.reload();
        }, []);
        return (
          <>
            <div id="drop-area"
              onDragEnter={() => setIsDragOver(true)}
              onDragLeave={() => setIsDragOver(false)}
              onDragOver={() => setIsDragOver(true)}
              onDrop={onDrop}
              className={isDragOver ? 'drag-over' : ''}
            >
              {children || 'Drag here to preview'}
            </div>
            <input type="file" id="file-input" multiple hidden />
            <div id="preview-container"></div>
          </>
        );
      }
    }
    catch (err) {
      // console.error(err);
    }
    // Return the original component if an error occurs
    return (
      <Tag {...props}>{children}</Tag>
    );
  };
};

interface GrowiNode extends Node {
  name: string;
  data: {
    hProperties?: Properties;
    hName?: string;
    hChildren?: Node[] | { type: string, value: string, url?: string }[];
    [key: string]: any;
  };
  type: string;
  attributes: {[key: string]: string}
  children: GrowiNode[] | { type: string, value: string, url?: string }[];
  value: string;
  title?: string;
  url?: string;
}


export const remarkPlugin: Plugin = () => {
  return (tree: Node) => {
    visit(tree, 'leafDirective', (node: Node) => {
      const n = node as unknown as GrowiNode;
      if (n.name !== 'dropzone') return;
      const data = n.data || (n.data = {});
      // Render your component
      const { value } = n.children[0] || { value: '' };
      data.hName = 'a'; // Tag name
      data.hChildren = [{ type: 'text', value }]; // Children
      // Set properties
      data.hProperties = {
        href: 'https://example.com/rss',
        title: JSON.stringify({ ...n.attributes, ...{ dropzone: true } }), // Pass to attributes to the component
      };
    });
  };
};
