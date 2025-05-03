"use client";
import { Listbox } from "visual-editor";

export default function Home() {
  return (<>
    <Listbox 
      items={["Item 1", "Item 2", "Item 3"]} 
      onSelect={(index) => console.log('Selected index:', index)}
    />
  </>);
}
