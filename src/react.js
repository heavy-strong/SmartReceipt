var e = React.createElement;

class App extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <button>TEST</button>
        )
    }
}

ReactDOM.render(e(App), document.querySelector('#app'));